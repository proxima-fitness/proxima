// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module WorkoutHistoryToolContent
 * Read-only workout cards shown when the agent calls getWorkoutHistory.
 * Depends on: HevyDayCard, mapBackedUpWorkoutToHevyRoutine, useHevyExercises.
 * Used by: MessageBubbles.
 */
import { useHevyExercises } from "@/api/hooks";
import {
    mapBackedUpWorkoutToHevyRoutine,
    PREVIEW_MAX_EXERCISES,
} from "@/api/workout-history-read";
import type { TWorkoutHistoryToolOutput } from "@/app/api/chat/tools/workout-history";
import { HevyDayCard } from "@/components/program-builder/hevy/HevyDayCard";
import { buildWorkoutDetailHref } from "@/lib/build-program-url";

type TWorkoutHistorySuccessOutput = Extract<TWorkoutHistoryToolOutput, { workouts: TBackedUpWorkout[] }>;

type TWorkoutHistoryInput = {
    limit?: number;
    since?: string;
};

interface IProps {
    input?: TWorkoutHistoryInput;
    output?: TWorkoutHistoryToolOutput;
    isInFlight: boolean;
    /** Serialized build-program search params for return navigation. */
    returnQs?: string;
}

function formatSinceLabel(since: string): string {
    return since.slice(0, 10);
}

/** Renders loading, empty, or horizontal read-only workout cards from tool output. */
export function WorkoutHistoryToolContent({ input, output, isInFlight, returnQs }: IProps) {
    const { data: hevyExercises } = useHevyExercises();

    if (isInFlight) {
        const limitNote = input?.limit != null ? ` (up to ${input.limit})` : "";
        const sinceNote = input?.since ? ` since ${formatSinceLabel(input.since)}` : "";
        return (
            <p className="text-sm text-muted-foreground px-3 pb-3">
                Fetching logged workouts{limitNote}{sinceNote}…
            </p>
        );
    }

    if (!output || "error" in output) {
        return null;
    }

    const successOutput = output as TWorkoutHistorySuccessOutput;

    if (successOutput.totalReturned === 0) {
        const sinceNote = successOutput.since ? ` since ${formatSinceLabel(successOutput.since)}` : "";
        const syncNote = successOutput.syncPending ? " Backup sync may still be in progress." : "";
        return (
            <p className="text-sm text-muted-foreground px-3 pb-3">
                No backed-up workouts found{sinceNote}.{syncNote}
            </p>
        );
    }

    return (
        <div className="space-y-2 px-1 pb-2">
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                {successOutput.workouts.map((workout) => {
                    const totalExerciseCount = workout.workout_exercises?.length ?? 0;
                    const day = mapBackedUpWorkoutToHevyRoutine(workout, {
                        previewMaxExercises: PREVIEW_MAX_EXERCISES,
                    });

                    return (
                        <div
                            key={workout.id}
                            data-workout-preview-card
                            className="shrink-0 snap-start w-[min(100%,360px)] sm:w-[385px] lg:w-[450px]"
                        >
                            <HevyDayCard
                                variant="read-only"
                                day={day}
                                workoutId={workout.id}
                                seeMoreHref={buildWorkoutDetailHref(workout.id, { returnQs })}
                                totalExerciseCount={totalExerciseCount}
                                hevyExercises={hevyExercises}
                            />
                        </div>
                    );
                })}
            </div>
            {(successOutput.hasMore || successOutput.syncPending) && (
                <p className="text-xs text-muted-foreground px-2">
                    {successOutput.hasMore && "More workouts available in backup. "}
                    {successOutput.syncPending && "Sync may still be catching up."}
                </p>
            )}
        </div>
    );
}
