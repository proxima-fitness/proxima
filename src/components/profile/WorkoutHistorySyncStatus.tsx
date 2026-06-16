"use client";

/**
 * @module WorkoutHistorySyncStatus
 *
 * Profile sync banner: backed-up count vs live Hevy count in a card matching ResumeDraftBanner.
 * Green when caught up, yellow while syncing, red on cursor error, grey when paused.
 * Pause/play toggles background sync (persisted in localStorage).
 *
 * Depends on: useWorkoutHistorySyncPoller, useHevySecret, workout-history-sync helpers
 * Used by: ProfileContent
 */
import { useUserContext } from "@/contexts/UserContext";
import { useHevySecret } from "@/api/hooks";
import { getWorkoutHistorySyncStatus } from "@/api/workout-history-sync";
import { useWorkoutHistorySyncPoller } from "@/hooks/useWorkoutHistorySyncPoller";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";

const BANNER_CLASS =
    "relative flex w-full min-w-lg max-w-2xl flex-col sm:flex-row flex-nowrap items-center gap-4 rounded-2xl border border-border bg-muted/40 px-6 py-3 shadow-xs";

const STATUS_DOT_CLASS: Record<NonNullable<ReturnType<typeof getWorkoutHistorySyncStatus>>, string> = {
    synced: "bg-green-500",
    syncing: "bg-yellow-500 animate-pulse",
    error: "bg-red-500",
    paused: "bg-muted-foreground/60",
};

const STATUS_ARIA_LABEL: Record<NonNullable<ReturnType<typeof getWorkoutHistorySyncStatus>>, string> = {
    synced: "Workout history fully synced",
    syncing: "Workout history syncing",
    error: "Workout history sync failed",
    paused: "Workout history sync paused",
};

/** Renders Hevy backup status below profile when Hevy is connected. */
export function WorkoutHistorySyncStatus() {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);

    const { progress, isPolling, pause, play } = useWorkoutHistorySyncPoller(hevyConnected);

    if (!hevyConnected) {
        return null;
    }

    if (!progress) {
        return (
            <Skeleton
                className={cn(BANNER_CLASS, "h-14 border-0 bg-muted/40")}
                aria-label="Loading workout sync status"
            />
        );
    }

    const status = getWorkoutHistorySyncStatus(progress);
    if (!status) {
        return null;
    }

    const { backedUpCount, hevyCount, rateLimited } = progress;
    const countLabel =
        status === "paused"
            ? `Sync paused · ${backedUpCount} / ${hevyCount}`
            : status === "syncing"
              ? `Syncing workout history… ${backedUpCount} / ${hevyCount}`
              : `${backedUpCount} / ${hevyCount} workouts synced`;

    const activityHint =
        status === "syncing"
            ? isPolling
                ? "Backing up now"
                : rateLimited
                  ? "Waiting on Hevy rate limit"
                  : "Next backup soon"
            : status === "paused"
              ? "Resume when ready"
              : null;

    const showPausePlay = status === "syncing" || status === "paused";

    return (
        <div
            className={BANNER_CLASS}
            role="status"
            aria-live="polite"
            aria-label={`${STATUS_ARIA_LABEL[status]}: ${backedUpCount} of ${hevyCount}`}
        >
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                    className={cn("size-3 shrink-0 rounded-full", STATUS_DOT_CLASS[status])}
                    aria-hidden
                />
                <p className="min-w-0 text-sm font-medium text-foreground sm:text-base">
                    <span className="tabular-nums">{countLabel}</span>
                    {activityHint ? (
                        <span className="font-normal text-muted-foreground">
                            {" "}
                            · {activityHint}
                        </span>
                    ) : null}
                </p>
            </div>
            <div className="flex h-9 w-full shrink-0 flex-row items-center justify-end sm:w-auto">
                {showPausePlay ? (
                    <Button
                        type="button"
                        size="default"
                        className="h-9 shrink-0 gap-2 bg-lightSecondary px-5 text-white hover:bg-lightSecondary/90"
                        aria-label={
                            status === "paused" ? "Resume workout history sync" : "Pause workout history sync"
                        }
                        onClick={() => {
                            if (status === "paused") {
                                play();
                            } else {
                                void pause();
                            }
                        }}
                    >
                        {status === "paused" ? (
                            <>
                                <Play className="size-4" aria-hidden />
                                Resume
                            </>
                        ) : (
                            <>
                                <Pause className="size-4" aria-hidden />
                                Pause
                            </>
                        )}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
