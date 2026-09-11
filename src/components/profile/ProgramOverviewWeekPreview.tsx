/**
 * @module ProgramOverviewWeekPreview (UI)
 *
 * Selected-week glance (ADR 0020 / 03, ADR 0013 / SP5–6): one day at a time.
 * Source is Program prescription, Hevy week copy, or Planned vs completed.
 *
 * Depends on: react-query, useHevyExercises, HevyDayCard, ProgramOverviewExportWeek,
 *             ProgramOverviewWeekPreviewModel, WeekPreviewSources, Button, Skeleton
 * Used by: ProgramOverviewWeekList
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHevyExercises } from "@/api/hooks";
import { supabase } from "@/api/index";
import { getWorkoutsByRoutineIds } from "@/api/workout-history-read";
import { HevyDayCard } from "@/components/program-builder/hevy/HevyDayCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
                <span className="absolute right-3 top-3 rounded-full border border-border/60 px-2 py-0.5 font-secondary text-xs text-muted-foreground">
                    {slot.source}
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
        return <PreviewSkeleton />;
    }

    if (isError || workoutsError) {
        return (
            <p className="mt-2 text-sm text-muted-foreground">
                Couldn&apos;t load this week&apos;s workouts. Try again later.
            </p>
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
            <p className="mt-2 text-sm text-muted-foreground">
                No workouts in the prescription for this week.
            </p>
        );
    }

    const safeIndex = Math.min(dayIndex, preview.days.length - 1);
    const day = preview.days[safeIndex]!;
    const isPair = day.slots.length > 1;
    const canPage = preview.days.length > 1;

    return (
        <div className="mt-3" aria-label={`Week ${nthWeek} preview`}>
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
                        onClick={() => setDayIndex((i) => Math.max(0, i - 1))}
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
                        onClick={() => setDayIndex((i) => Math.min(preview.days.length - 1, i + 1))}
                    >
                        <ChevronRight className="size-5" aria-hidden />
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
