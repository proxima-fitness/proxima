/**
 * @module (app)/workout/[id]/WorkoutDetailContent
 *
 * Client-only logged workout detail: metadata block + full read-only HevyDayCard.
 * React Query → GET /api/workout-history/workouts/[id].
 *
 * Depends on: useWorkoutDetail, useHevyExercises, HevyDayCard, UserContext
 * Used by: (app)/workout/[id]/page.tsx
 */
"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useUserContext } from "@/contexts/UserContext";
import { useHevyExercises, useWorkoutDetail } from "@/api/hooks";
import { WorkoutNotFoundError } from "@/api/workout-history-browse";
import { HEVY_WORKOUT_SOURCE } from "@/api/workout-history";
import { HevyDayCard } from "@/components/program-builder/hevy/HevyDayCard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutDetailBackLink } from "./WorkoutDetailBackLink";
import {
    convertSupabaseDateToReadable,
    formatWorkoutWallDuration,
} from "@/utils/general/helpers";
import styles from "@/style";

const SOURCE_LABELS: Record<string, string> = {
    [HEVY_WORKOUT_SOURCE]: "Hevy",
};

function countExercisesAndSets(workout: THevyRoutine): { exercises: number; sets: number } {
    const exercises = workout.exercises ?? [];
    const sets = exercises.reduce((total, exercise) => total + (exercise.sets?.length ?? 0), 0);
    return { exercises: exercises.length, sets };
}

function WorkoutDetailSkeleton() {
    return (
        <div className="mx-auto w-full max-w-2xl space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
    );
}

interface IProps {
    workoutId: string;
    returnFrom?: string | null;
    returnQs?: string | null;
    /** Legacy links that only passed chat without returnQs. */
    returnChatId?: string | null;
}

/** Renders logged workout metadata and full exercise card. */
export function WorkoutDetailContent({
    workoutId,
    returnFrom,
    returnQs,
    returnChatId,
}: IProps) {
    const { user, isLoading: isUserLoading } = useUserContext();
    const { data: workout, isLoading, isError, error } = useWorkoutDetail(user, workoutId);
    const { data: hevyExercises } = useHevyExercises(!!user);

    if (isUserLoading || (user && isLoading)) {
        return (
            <div className={`min-h-[50vh] bg-muted/30 py-8 max-sm:px-3 sm:px-12 md:px-16 lg:px-20 xl:px-24 ${styles.flexCenter}`}>
                <div className={`${styles.boxWidth} max-w-2xl`}>
                    <WorkoutDetailSkeleton />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={`min-h-[50vh] bg-muted/30 py-8 max-sm:px-3 sm:px-12 md:px-16 lg:px-20 xl:px-24 ${styles.flexCenter}`}>
                <Card className="max-w-md rounded-2xl px-6 py-12 text-center shadow-sm">
                    <h1 className="text-xl font-semibold tracking-tight">Sign in required</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Log in to view your backed-up workouts.
                    </p>
                    <Link
                        href="/auth/login"
                        className="mt-6 inline-block text-sm font-medium text-lightSecondary hover:underline"
                    >
                        Sign in
                    </Link>
                </Card>
            </div>
        );
    }

    if (isError && error instanceof WorkoutNotFoundError) {
        notFound();
    }

    if (isError || !workout) {
        return (
            <div className={`min-h-[50vh] bg-muted/30 py-8 max-sm:px-3 sm:px-12 md:px-16 lg:px-20 xl:px-24 ${styles.flexCenter}`}>
                <Card className="max-w-md rounded-2xl px-6 py-12 text-center shadow-sm">
                    <h1 className="text-xl font-semibold tracking-tight">Could not load workout</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Please try again later.</p>
                    <WorkoutDetailBackLink
                        returnFrom={returnFrom}
                        returnQs={returnQs}
                        returnChatId={returnChatId}
                        showArrow={false}
                        className="mt-6 inline-block text-sm font-medium text-lightSecondary hover:underline"
                    />
                </Card>
            </div>
        );
    }

    const { exercises: exerciseCount, sets: setCount } = countExercisesAndSets(workout);
    const sourceLabel = workout.source ? SOURCE_LABELS[workout.source] ?? workout.source : undefined;
    const formattedDate = convertSupabaseDateToReadable(workout.started_at);
    const duration = formatWorkoutWallDuration(workout.started_at, workout.ended_at);

    return (
        <div className={`min-h-[50vh] bg-muted/30 py-8 max-sm:px-3 sm:px-12 md:px-16 lg:px-20 xl:px-24 ${styles.flexCenter} flex-col`}>
            <div className={`${styles.boxWidth} w-full max-w-2xl flex flex-col gap-6`}>
                <Card className="rounded-2xl border border-border/60 bg-card px-5 py-6 shadow-sm sm:px-8">
                    <WorkoutDetailBackLink
                        returnFrom={returnFrom}
                        returnQs={returnQs}
                        returnChatId={returnChatId}
                    />

                    <header className="mt-4 space-y-3">
                        <h1 className="font-tertiary text-2xl sm:text-3xl tracking-tight">{workout.title}</h1>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground font-secondary">
                            {formattedDate && <span>{formattedDate}</span>}
                            {duration && <span>{duration}</span>}
                            {sourceLabel && (
                                <Badge variant="secondary" className="font-normal">
                                    {sourceLabel}
                                </Badge>
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground font-secondary">
                            {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                            {" · "}
                            {setCount} {setCount === 1 ? "set" : "sets"}
                        </p>

                        {workout.notes?.trim() && (
                            <p className="text-sm text-foreground/90 font-secondary whitespace-pre-wrap border-t border-border/40 pt-3">
                                {workout.notes}
                            </p>
                        )}
                    </header>
                </Card>

                <div className="flex justify-center w-full">
                    <HevyDayCard
                        variant="read-only"
                        day={workout}
                        hevyExercises={hevyExercises}
                    />
                </div>
            </div>
        </div>
    );
}
