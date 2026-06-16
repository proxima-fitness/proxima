"use client";

/**
 * @module WorkoutHistorySyncStatus
 *
 * Profile sync indicator: colored dot + backed-up count vs live Hevy count.
 * Green when caught up, yellow while syncing, red on cursor error, grey when paused.
 * Pause/play toggles background sync (persisted in localStorage).
 *
 * Depends on: useWorkoutHistorySyncPoller, useHevySecret, workout-history-sync helpers
 * Used by: ProfileHero
 */
import { useUserContext } from "@/contexts/UserContext";
import { useHevySecret } from "@/api/hooks";
import { getWorkoutHistorySyncStatus } from "@/api/workout-history-sync";
import { useWorkoutHistorySyncPoller } from "@/hooks/useWorkoutHistorySyncPoller";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";

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

/** Renders Hevy backup status below profile social stats when Hevy is connected. */
export function WorkoutHistorySyncStatus() {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);

    const { progress, isPolling, pause, play } = useWorkoutHistorySyncPoller(hevyConnected);

    if (!hevyConnected) {
        return null;
    }

    if (!progress) {
        return <Skeleton className="h-5 w-52" aria-label="Loading workout sync status" />;
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
            className="flex items-center gap-2 pt-2 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-label={`${STATUS_ARIA_LABEL[status]}: ${backedUpCount} of ${hevyCount}`}
        >
            <span
                className={cn("size-2.5 shrink-0 rounded-full", STATUS_DOT_CLASS[status])}
                aria-hidden
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="tabular-nums text-foreground/90">{countLabel}</span>
                {activityHint ? (
                    <span className="text-xs text-muted-foreground">{activityHint}</span>
                ) : null}
            </div>
            {showPausePlay ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
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
                        <Play className="size-4" aria-hidden />
                    ) : (
                        <Pause className="size-4" aria-hidden />
                    )}
                </Button>
            ) : null}
        </div>
    );
}
