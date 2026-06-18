"use client";

/**
 * @module ProfileCalendarSection
 *
 * Profile calendar card — month grid with teal workout-day highlights and session tooltips.
 *
 * Depends on: useProfileCalendar, workout-history-calendar helpers, buildWorkoutDetailHref
 * Used by: ProfileContent
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useProfileCalendar } from "@/api/hooks";
import {
    buildSundayStartCalendarGrid,
    formatLocalDateKey,
    groupWorkoutsByLocalDate,
} from "@/api/workout-history-calendar";
import { buildWorkoutDetailHref } from "@/lib/build-program-url";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    convertSupabaseDateToReadable,
    formatWorkoutWallDuration,
} from "@/utils/general/helpers";
import { cn } from "@/lib/utils";

const PROFILE_CARD_CLASS =
    "rounded-2xl border border-border/60 bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function CalendarGridSkeleton() {
    return (
        <div className="grid grid-cols-7 gap-y-1.5 pt-2">
            {Array.from({ length: 42 }).map((_, index) => (
                <Skeleton key={index} className="mx-auto size-7 rounded-full" />
            ))}
        </div>
    );
}

function formatMonthLabel(year: number, month: number): string {
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
    const date = new Date(year, month - 1 + delta, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function CalendarDayTooltipContent({ workouts }: { workouts: TProfileCalendarWorkout[] }) {
    return (
        <div className="space-y-3">
            {workouts.map((workout, index) => {
                const duration = formatWorkoutWallDuration(workout.started_at, workout.ended_at);
                const readableDate = convertSupabaseDateToReadable(workout.started_at);
                const meta = [duration, readableDate].filter(Boolean).join(" · ");

                return (
                    <div key={workout.id}>
                        {index > 0 ? <Separator className="mb-3" /> : null}
                        <p className="text-sm font-medium text-foreground">{workout.title}</p>
                        {meta ? (
                            <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
                        ) : null}
                        <div className="mt-3 text-center">
                            <Link
                                href={buildWorkoutDetailHref(workout.id)}
                                className="text-sm font-medium text-lightSecondary hover:text-lightSecondary/80"
                            >
                                See Workout
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function CalendarWorkoutDay({
    day,
    workouts,
    open,
    onOpenChange,
    isToday,
}: {
    day: number;
    workouts: TProfileCalendarWorkout[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isToday: boolean;
}) {
    const closeTimeoutRef = useRef<number | undefined>(undefined);

    const clearCloseTimeout = () => {
        if (closeTimeoutRef.current != null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = undefined;
        }
    };

    const scheduleClose = () => {
        clearCloseTimeout();
        closeTimeoutRef.current = window.setTimeout(() => onOpenChange(false), 120);
    };

    useEffect(() => () => clearCloseTimeout(), []);

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "mx-auto flex size-7 items-center justify-center rounded-full bg-lightSecondary text-xs font-medium tabular-nums text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isToday && "ring-2 ring-foreground",
                    )}
                    aria-label={`${workouts.length} workout${workouts.length === 1 ? "" : "s"} on day ${day}`}
                    onMouseEnter={() => {
                        clearCloseTimeout();
                        onOpenChange(true);
                    }}
                    onMouseLeave={scheduleClose}
                    onClick={() => onOpenChange(!open)}
                >
                    {day}
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="center"
                className="w-64 rounded-xl border border-border/60 bg-card p-4 shadow-lg"
                onMouseEnter={clearCloseTimeout}
                onMouseLeave={scheduleClose}
            >
                <CalendarDayTooltipContent workouts={workouts} />
            </PopoverContent>
        </Popover>
    );
}

/** Month calendar with backed-up workout day highlights. */
export function ProfileCalendarSection() {
    const { user } = useUserContext();
    const now = new Date();
    const [visibleYear, setVisibleYear] = useState(now.getFullYear());
    const [visibleMonth, setVisibleMonth] = useState(now.getMonth() + 1);
    const [openDayKey, setOpenDayKey] = useState<string | null>(null);

    const { data, isLoading, isError } = useProfileCalendar(
        user,
        true,
        visibleYear,
        visibleMonth,
    );

    const workoutsByDay = useMemo(
        () => groupWorkoutsByLocalDate(data?.workouts ?? []),
        [data?.workouts],
    );

    const grid = useMemo(
        () => buildSundayStartCalendarGrid(visibleYear, visibleMonth),
        [visibleYear, visibleMonth],
    );

    const todayLocalDateKey = useMemo(() => {
        const today = new Date();
        return formatLocalDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
    }, []);

    const goToPreviousMonth = () => {
        const next = shiftMonth(visibleYear, visibleMonth, -1);
        setVisibleYear(next.year);
        setVisibleMonth(next.month);
        setOpenDayKey(null);
    };

    const goToNextMonth = () => {
        const next = shiftMonth(visibleYear, visibleMonth, 1);
        setVisibleYear(next.year);
        setVisibleMonth(next.month);
        setOpenDayKey(null);
    };

    return (
        <section aria-labelledby="profile-calendar-heading" className="h-full">
            <Card className={cn(PROFILE_CARD_CLASS, "h-full flex flex-col")}>
                <div className="flex items-center justify-between gap-2">
                    <h2
                        id="profile-calendar-heading"
                        className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-1.5"
                    >
                        <CalendarDays className="size-4 shrink-0 opacity-80" aria-hidden />
                        Calendar
                    </h2>
                    <div className="flex items-center gap-0.5">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full bg-muted/50 text-foreground hover:bg-muted"
                            aria-label="Previous month"
                            onClick={goToPreviousMonth}
                        >
                            <ChevronLeft className="size-4" aria-hidden />
                        </Button>
                        <p className="min-w-28 text-center text-xs font-medium tabular-nums text-foreground">
                            {formatMonthLabel(visibleYear, visibleMonth)}
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full bg-muted/50 text-foreground hover:bg-muted"
                            aria-label="Next month"
                            onClick={goToNextMonth}
                        >
                            <ChevronRight className="size-4" aria-hidden />
                        </Button>
                    </div>
                </div>

                <div className="border-b border-border/60 pb-2 pt-2">
                    <div className="grid grid-cols-7">
                        {WEEKDAY_LABELS.map((label, index) => (
                            <span
                                key={`${label}-${index}`}
                                className="text-center text-[11px] font-medium text-muted-foreground"
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <CalendarGridSkeleton />
                ) : isError ? (
                    <p className="pt-2 text-xs text-muted-foreground">
                        Could not load calendar. Please try again later.
                    </p>
                ) : (
                    <div className="grid grid-cols-7 gap-y-1.5 pt-2">
                        {grid.map((cell) => {
                            const dayWorkouts = workoutsByDay.get(cell.localDateKey) ?? [];
                            const isToday = cell.localDateKey === todayLocalDateKey;

                            if (dayWorkouts.length > 0) {
                                return (
                                    <div key={cell.localDateKey} className="flex justify-center">
                                        <CalendarWorkoutDay
                                            day={cell.day}
                                            workouts={dayWorkouts}
                                            open={openDayKey === cell.localDateKey}
                                            onOpenChange={(open) =>
                                                setOpenDayKey(open ? cell.localDateKey : null)
                                            }
                                            isToday={isToday}
                                        />
                                    </div>
                                );
                            }

                            return (
                                <div key={cell.localDateKey} className="flex justify-center">
                                    <span
                                        className={cn(
                                            "flex size-7 items-center justify-center text-xs tabular-nums",
                                            cell.isCurrentMonth
                                                ? "text-foreground"
                                                : "text-muted-foreground/50",
                                            isToday && "rounded-full ring-2 ring-foreground/40",
                                        )}
                                    >
                                        {cell.day}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </section>
    );
}
