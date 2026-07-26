/**
 * @module ProgramOverviewWeekPreview (UI)
 *
 * Selected-week prescription glance (ADR 0020 / 03): one read-only HevyDayCard
 * at a time with prev/next controls. Loads full prescription once per program.
 *
 * Depends on: react-query, useHevyExercises, HevyDayCard, ProgramOverviewExportWeek,
 *             ProgramOverviewWeekPreviewModel, Button, Skeleton
 * Used by: ProgramOverviewWeekList
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHevyExercises } from "@/api/hooks";
import { HevyDayCard } from "@/components/program-builder/hevy/HevyDayCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadPrescriptionHevyRoutines } from "./ProgramOverviewExportWeek";
import {
    slicePrescriptionWeekDays,
    weekPreviewDayKey,
} from "./ProgramOverviewWeekPreviewModel";

export const PROGRAM_PRESCRIPTION_HEVY_QUERY_KEY = ["program-prescription-hevy"] as const;

export type TProgramOverviewWeekPreviewProps = {
    programId: number;
    nthWeek: number;
};

function PreviewSkeleton() {
    return (
        <div className="mt-3 flex flex-col items-center gap-3" aria-hidden>
            <Skeleton className="h-[280px] w-full max-w-[450px] rounded-xl" />
            <div className="flex items-center gap-2">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="size-9 rounded-full" />
            </div>
        </div>
    );
}

/**
 * Single-day HevyDayCard Week preview with carousel controls.
 * Remount via `key={programId-nthWeek}` from parent to reset day index.
 */
export function ProgramOverviewWeekPreview({
    programId,
    nthWeek,
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
    const [dayIndex, setDayIndex] = useState(0);

    const days = slicePrescriptionWeekDays(routines ?? [], nthWeek);

    if (isLoading) {
        return <PreviewSkeleton />;
    }

    if (isError) {
        return (
            <p className="mt-2 text-sm text-muted-foreground">
                Couldn&apos;t load this week&apos;s workouts. Try again later.
            </p>
        );
    }

    if (days.length === 0) {
        return (
            <p className="mt-2 text-sm text-muted-foreground">
                No workouts in the prescription for this week.
            </p>
        );
    }

    // Clamp if prescription shrinks while mounted (no effect — derive for render).
    const safeIndex = Math.min(dayIndex, days.length - 1);
    const day = days[safeIndex]!;
    const key = weekPreviewDayKey(day, nthWeek, safeIndex);
    const cardDay: THevyRoutine = {
        ...day,
        id: key,
    };
    const canPage = days.length > 1;

    return (
        <div className="mt-3" aria-label={`Week ${nthWeek} preview`}>
            <div className="flex justify-center">
                <div className="w-full max-w-[450px]">
                    <HevyDayCard
                        variant="read-only"
                        day={cardDay}
                        folder_id={nthWeek - 1}
                        title={`Week ${nthWeek}`}
                        hevyExercises={hevyExercises}
                        showSessionGoalBadge={false}
                    />
                </div>
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
                        Day {safeIndex + 1} of {days.length}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                        disabled={safeIndex >= days.length - 1}
                        aria-label="Next day"
                        onClick={() => setDayIndex((i) => Math.min(days.length - 1, i + 1))}
                    >
                        <ChevronRight className="size-5" aria-hidden />
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
