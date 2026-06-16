 
"use client";

/**
 * @module ProfileStatisticsSection
 *
 * Profile statistics card: Duration/Reps tabs, weekly bar chart, "This week" headline,
 * 4/12 week range selector. Connect CTA when Hevy not connected.
 *
 * Depends on: useProfileStatistics, useWorkoutHistorySyncPoller, ConnectHevyDialog
 * Used by: ProfileContent
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ChartLineIcon } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useProfileStatistics } from "@/api/hooks";
import {
    formatDurationFromSeconds,
    formatRepsTotal,
    formatWeekBucketLabel,
} from "@/api/workout-history-statistics";
import { PROFILE_STATISTICS_QUERY_KEY } from "@/api/workout-history-browse";
import { isWorkoutHistorySyncInProgress } from "@/api/workout-history-sync";
import { ConnectHevyDialog } from "@/components/header/ConnectHevyDialog";
import { Button } from "@/components/ui/button";
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

const PROFILE_CARD_CLASS =
    "rounded-2xl border border-border/60 bg-card px-4 py-5 shadow-sm sm:px-6 sm:py-6";

type TMetric = "duration" | "reps";
type TWeekRange = 4 | 12;

interface IProps {
    hevyConnected: boolean;
}

function StatisticsChartSkeleton() {
    return (
        <div className="space-y-4 pt-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-36 w-full rounded-xl" />
        </div>
    );
}

function formatBarTooltipValue(value: number, metric: TMetric): string {
    if (metric === "duration") {
        return formatDurationFromSeconds(value);
    }
    return value === 1 ? "1 rep" : `${formatRepsTotal(value)} reps`;
}

function WeeklyBarChart({
    buckets,
    metric,
}: {
    buckets: TProfileStatisticsWeekBucket[];
    metric: TMetric;
}) {
    const values = buckets.map((bucket) =>
        metric === "duration" ? bucket.durationSeconds : bucket.reps,
    );
    const maxValue = Math.max(...values, 1);

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className="mt-6 flex items-end gap-2 sm:gap-3"
                role="img"
                aria-label={`Weekly ${metric} bar chart`}
            >
                {buckets.map((bucket, index) => {
                    const value = values[index];
                    const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const isCurrentWeek = index === buckets.length - 1;
                    const weekLabel = formatWeekBucketLabel(bucket.weekStart);
                    const valueLabel = formatBarTooltipValue(value, metric);

                    return (
                        <div
                            key={bucket.weekStart}
                            className="flex min-w-0 flex-1 flex-col items-center gap-2"
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex h-32 w-full cursor-default flex-col justify-end rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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

/** Statistics card with weekly chart or connect CTA. */
export function ProfileStatisticsSection({ hevyConnected }: IProps) {
    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const [connectOpen, setConnectOpen] = useState(false);
    const [metric, setMetric] = useState<TMetric>("duration");
    const [weekRange, setWeekRange] = useState<TWeekRange>(12);

    const { data, isLoading, isError } = useProfileStatistics(user, hevyConnected, weekRange);

    const { data: progress } = useQuery({
        queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
        queryFn: fetchWorkoutHistorySyncProgress,
        enabled: hevyConnected,
        staleTime: 5_000,
        refetchOnWindowFocus: false,
    });

    const prevBackedUpCount = useRef<number | undefined>(undefined);

    useEffect(() => {
        const backedUpCount = progress?.backedUpCount;
        if (
            backedUpCount != null &&
            prevBackedUpCount.current != null &&
            backedUpCount > prevBackedUpCount.current
        ) {
            void queryClient.invalidateQueries({
                queryKey: [...PROFILE_STATISTICS_QUERY_KEY, user?.id],
            });
        }
        prevBackedUpCount.current = backedUpCount;
    }, [progress?.backedUpCount, queryClient, user?.id]);

    const isSyncing = progress != null && isWorkoutHistorySyncInProgress(progress);

    const headlineValue = useMemo(() => {
        if (!data) {
            return "";
        }
        return metric === "duration"
            ? formatDurationFromSeconds(data.thisWeek.durationSeconds)
            : formatRepsTotal(data.thisWeek.reps);
    }, [data, metric]);

    const hasChartData = useMemo(() => {
        if (!data) {
            return false;
        }
        return data.buckets.some(
            (bucket) => bucket.durationSeconds > 0 || bucket.reps > 0,
        );
    }, [data]);

    return (
        <>
            <section aria-labelledby="profile-statistics-heading">
                <Card className={PROFILE_CARD_CLASS}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0 space-y-1">
                            <h2
                                id="profile-statistics-heading"
                                className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2"
                            >
                                <ChartLineIcon className="size-5 shrink-0 opacity-80" aria-hidden />
                                Statistics
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Weekly totals from your Hevy backup.
                            </p>
                        </div>
                        {hevyConnected ? (
                            <Select
                                value={String(weekRange)}
                                onValueChange={(value) =>
                                    setWeekRange(value === "12" ? 12 : 4)
                                }
                            >
                                <SelectTrigger
                                    className="h-9 w-[140px] shrink-0 rounded-full border-border/60 text-xs"
                                    aria-label="Chart time range"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="4">Last 4 weeks</SelectItem>
                                    <SelectItem value="12">Last 12 weeks</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : null}
                    </div>

                    {!hevyConnected ? (
                        <div className="pt-4">
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Connect Hevy to see weekly duration and rep totals from your
                                backed-up workouts.
                            </p>
                            <Button
                                type="button"
                                className="mt-4 rounded-full bg-lightSecondary px-5 text-white hover:bg-lightSecondary/90"
                                onClick={() => setConnectOpen(true)}
                            >
                                Connect Hevy
                            </Button>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <StatisticsChartSkeleton />
                    ) : isError || !data ? (
                        <p className="pt-4 text-sm text-muted-foreground">
                            Could not load statistics. Please try again later.
                        </p>
                    ) : (
                        <div className="pt-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        This week
                                    </p>
                                    <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                                        {headlineValue}
                                    </p>
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
                                </div>
                            </div>

                            {!hasChartData ? (
                                <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
                                    {isSyncing ? (
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <Loader2
                                                className="size-4 shrink-0 animate-spin"
                                                aria-hidden
                                            />
                                            <span>Syncing workout history… charts fill in as data arrives.</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No backed-up workouts in this range yet. Log a workout
                                            in Hevy to see weekly totals here.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <WeeklyBarChart buckets={data.buckets} metric={metric} />
                                    {isSyncing ? (
                                        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Loader2
                                                className="size-3 shrink-0 animate-spin"
                                                aria-hidden
                                            />
                                            Still syncing older workouts — chart may update.
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>
                    )}
                </Card>
            </section>

            <ConnectHevyDialog
                openConnectHevyDialog={connectOpen}
                handleOpenConnectHevyDialog={setConnectOpen}
            />
        </>
    );
}
