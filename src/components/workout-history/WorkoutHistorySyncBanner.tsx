"use client";

/**
 * @module WorkoutHistorySyncBanner
 *
 * Global banner for Hevy workout backup progress and sync errors.
 * Shows "Syncing workout history… N / total" during backfill; error + retry on failure.
 *
 * Depends on: useWorkoutHistorySyncPoller, useHevySecret, Progress, Button
 * Used by: (app)/layout via WorkoutHistorySyncBannerDynamic
 */
import { useUserContext } from "@/contexts/UserContext";
import { useHevySecret } from "@/api/hooks";
import { shouldShowWorkoutHistorySyncBanner } from "@/api/workout-history-sync";
import { useWorkoutHistorySyncPoller } from "@/hooks/useWorkoutHistorySyncPoller";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2 } from "lucide-react";

function formatSyncError(message: string): string {
    if (message.includes("429")) {
        return "Hevy rate limit reached. Wait a moment, then retry.";
    }
    return message.length > 120 ? `${message.slice(0, 117)}…` : message;
}

/**
 * Renders backup progress or error banner when Hevy is connected and sync is active or failed.
 */
export function WorkoutHistorySyncBanner() {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);

    const { progress, isPolling, retry } = useWorkoutHistorySyncPoller(hevyConnected);

    if (!hevyConnected || !shouldShowWorkoutHistorySyncBanner(progress)) {
        return null;
    }

    const { backedUpCount, hevyCount, syncError } = progress!;
    const hasError = Boolean(syncError);
    const percent =
        hevyCount > 0 ? Math.min(100, Math.round((backedUpCount / hevyCount) * 100)) : 0;

    return (
        <div
            role="status"
            aria-live="polite"
            className="border-b border-border/40 bg-muted/40 px-4 py-3 dark:border-white/10"
        >
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {hasError ? (
                        <>
                            <div className="flex items-start gap-2 text-sm font-medium text-foreground">
                                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                                <span>Workout history sync failed</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {formatSyncError(syncError!)}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                {isPolling ? (
                                    <Loader2 className="size-4 shrink-0 animate-spin text-lightSecondary" aria-hidden />
                                ) : null}
                                <span>
                                    Syncing workout history… {backedUpCount} / {hevyCount}
                                </span>
                            </div>
                            <Progress value={percent} className="h-1.5" aria-label="Workout backup progress" />
                        </>
                    )}
                </div>

                {hasError ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="shrink-0"
                        disabled={isPolling}
                        onClick={retry}
                    >
                        {isPolling ? "Retrying…" : "Retry sync"}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
