// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module ProfileStatisticsSection
 *
 * Profile statistics card: Duration/Reps/Volume tabs, weekly bar chart, "This week"
 * headline, 4/12 week range selector. Reads every Workout source. Hevy connect is
 * not a gate (ADR 0026 / 06).
 *
 * Depends on: useProfileStatistics, useHevySecret, useWorkoutHistorySyncPoller
 * Used by: ProfileContent
 */

import { useMemo, useState } from "react";
import { Loader2, ChartLineIcon } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useHevySecret, useProfileStatistics } from "@/api/hooks";
import {
    formatDurationFromSeconds,
    formatProfileConsistencyLine,
    formatRepsTotal,
    formatVolumeTotal,
    formatWeekBucketLabel,
} from "@/api/workout-history-statistics";
import { isWorkoutHistorySyncInProgress } from "@/api/workout-history-sync";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { getWeightUnit } from "@/lib/weightUtils";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY } from "@/hooks/useWorkoutHistorySyncPoller";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkoutHistorySyncProgress } from "@/api/workout-history-sync";
import {
    PROFILE_SECTION_CARD_CLASS,
    ProfileSectionHeader,
} from "./profileSectionShell";

type TMetric = "duration" | "reps" | "volume";
type TWeekRange = 4 | 12;

function StatisticsChartSkeleton() {
    return (
        <div className="space-y-2 pt-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-24 w-full rounded-xl" />
        </div>
    );
}

function formatBarTooltipValue(
    value: number,
    metric: TMetric,
    isInLbs: boolean,
): string {
    if (metric === "duration") {
        return formatDurationFromSeconds(value);
    }
    if (metric === "volume") {
        const unit = getWeightUnit(isInLbs);
        return `${formatVolumeTotal(value, isInLbs)} ${unit}`;
    }
    return value === 1 ? "1 rep" : `${formatRepsTotal(value)} reps`;
}

function WeeklyBarChart({
    buckets,
    metric,
    isInLbs,
}: {
    buckets: TProfileStatisticsWeekBucket[];
    metric: TMetric;
    isInLbs: boolean;
}) {
    const values = buckets.map((bucket) => {
        if (metric === "duration") {
            return bucket.durationSeconds;
        }
        if (metric === "volume") {
            return bucket.volumeKg;
        }
        return bucket.reps;
    });
    const maxValue = Math.max(...values, 1);

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className="mt-3 flex items-end gap-1 sm:gap-1.5"
                role="img"
                aria-label={`Weekly ${metric} bar chart`}
            >
                {buckets.map((bucket, index) => {
                    const value = values[index];
                    const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const isCurrentWeek = index === buckets.length - 1;
                    const weekLabel = formatWeekBucketLabel(bucket.weekStart);
                    const valueLabel = formatBarTooltipValue(value, metric, isInLbs);

                    return (
                        <div
                            key={bucket.weekStart}
                            className="flex min-w-0 flex-1 flex-col items-center gap-1"
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex h-24 w-full cursor-default flex-col justify-end rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                        <div
                                            className={cn(
                                                "w-full rounded-t-md transition-colors hover:opacity-90",
                                                isCurrentWeek
                                                    ? "bg-lightSecondary"
                                                    : "bg-lightSecondary/55",
                                            )}
                                            style={{
                                                height: `${heightPercent}%`,
                                                minHeight: value > 0 ? 4 : 0,
                                            }}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    className="border-0 bg-lightSecondary text-center text-white"
                                >
                                    <p className="font-medium">{weekLabel}</p>
                                    <p className="text-white/90">{valueLabel}</p>
                                </TooltipContent>
                            </Tooltip>
                            <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                                {weekLabel}
                            </span>
                        </div>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}

/** Statistics card with weekly chart. */
export function ProfileStatisticsSection() {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);
    const { isInLbs } = usePoundsOrKgContext();
    const [metric, setMetric] = useState<TMetric>("duration");
    const [weekRange, setWeekRange] = useState<TWeekRange>(12);

    const { data, isLoading, isError } = useProfileStatistics(user, true, weekRange);

    const { data: progress } = useQuery({
        queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
        queryFn: fetchWorkoutHistorySyncProgress,
        enabled: hevyConnected,
        staleTime: 5_000,
        refetchOnWindowFocus: false,
    });

    const isSyncing = progress != null && isWorkoutHistorySyncInProgress(progress);

    const headlineValue = useMemo(() => {
        if (!data) {
            return "";
        }
        if (metric === "duration") {
            return formatDurationFromSeconds(data.thisWeek.durationSeconds);
        }
        if (metric === "volume") {
            const unit = getWeightUnit(isInLbs);
            return `${formatVolumeTotal(data.thisWeek.volumeKg, isInLbs)} ${unit}`;
        }
        return formatRepsTotal(data.thisWeek.reps);
    }, [data, metric, isInLbs]);

    const consistencyLine = useMemo(() => {
        if (!data || data.avgWorkoutsPerWeek == null) {
            return null;
        }
        return formatProfileConsistencyLine(data.thisWeekWorkouts, data.avgWorkoutsPerWeek);
    }, [data]);

    const hasChartData = useMemo(() => {
        if (!data) {
            return false;
        }
        return data.buckets.some(
            (bucket) =>
                bucket.durationSeconds > 0 || bucket.reps > 0 || bucket.volumeKg > 0,
        );
    }, [data]);

    return (
        <>
            <section aria-labelledby="profile-statistics-heading" className="h-full">
                <Card className={cn(PROFILE_SECTION_CARD_CLASS, "flex h-full flex-col")}>
                    <ProfileSectionHeader
                        id="profile-statistics-heading"
                        icon={
                            <ChartLineIcon
                                className="size-4 shrink-0 opacity-80"
                                aria-hidden
                            />
                        }
                        title="Statistics"
                        description="Weekly totals from your backed-up workouts."
                        action={
                            <Select
                                value={String(weekRange)}
                                onValueChange={(value) =>
                                    setWeekRange(value === "12" ? 12 : 4)
                                }
                            >
                                <SelectTrigger
                                    className="h-8 w-[132px] shrink-0 rounded-full border-border/60 text-xs"
                                    aria-label="Chart time range"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="4">Last 4 weeks</SelectItem>
                                    <SelectItem value="12">Last 12 weeks</SelectItem>
                                </SelectContent>
                            </Select>
                        }
                    />

                    {isLoading ? (
                        <StatisticsChartSkeleton />
                    ) : isError || !data ? (
                        <p className="pt-2 text-xs text-muted-foreground">
                            Could not load statistics. Please try again later.
                        </p>
                    ) : (
                        <div className="pt-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                        This week
                                    </p>
                                    <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
                                        {headlineValue}
                                    </p>
                                    {consistencyLine ? (
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                            {consistencyLine}
                                        </p>
                                    ) : null}
                                </div>
                                <div
                                    className="flex gap-1 rounded-full bg-muted/50 p-1"
                                    role="tablist"
                                    aria-label="Statistics metric"
                                >
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={metric === "duration"}
                                        className={cn(
                                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                            metric === "duration"
                                                ? "bg-lightSecondary/15 text-lightSecondary"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                        onClick={() => setMetric("duration")}
                                    >
                                        Duration
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={metric === "reps"}
                                        className={cn(
                                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                            metric === "reps"
                                                ? "bg-lightSecondary/15 text-lightSecondary"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                        onClick={() => setMetric("reps")}
                                    >
                                        Reps
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={metric === "volume"}
                                        className={cn(
                                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                            metric === "volume"
                                                ? "bg-lightSecondary/15 text-lightSecondary"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                        onClick={() => setMetric("volume")}
                                    >
                                        Volume
                                    </button>
                                </div>
                            </div>

                            {!hasChartData ? (
                                <div className="mt-3 px-1 py-6 text-center">
                                    {isSyncing ? (
                                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                            <Loader2
                                                className="size-4 shrink-0 animate-spin"
                                                aria-hidden
                                            />
                                            <span>
                                                Syncing workout history… charts fill in as data
                                                arrives.
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            No backed-up workouts in this range yet.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <WeeklyBarChart
                                        buckets={data.buckets}
                                        metric={metric}
                                        isInLbs={isInLbs}
                                    />
                                    {isSyncing ? (
                                        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <Loader2
                                                className="size-3 shrink-0 animate-spin"
                                                aria-hidden
                                            />
                                            Still syncing older workouts - chart may update.
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>
                    )}
                </Card>
            </section>
        </>
    );
}
