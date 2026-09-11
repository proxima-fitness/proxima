/**
 * @module workout-history-sync-toasts
 *
 * Imperative Sonner toasts for workout backup progress. Invoked from poller
 * query/mutation callbacks (not useEffect).
 */
import { toast } from "sonner";
import {
    isWorkoutHistorySyncInProgress,
    shouldShowWorkoutHistorySyncBanner,
} from "@/api/workout-history-sync";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { createElement } from "react";

export const WORKOUT_HISTORY_SYNC_TOAST_ID = "workout-history-sync";

let dismissed = false;
let wasTrackingSync = false;
let hadError = false;

function formatSyncError(message: string): string {
    if (message.includes("429")) {
        return "Hevy rate limit reached. Wait a moment, then retry.";
    }
    return message.length > 120 ? `${message.slice(0, 117)}…` : message;
}

export function dismissWorkoutHistorySyncToast(): void {
    toast.dismiss(WORKOUT_HISTORY_SYNC_TOAST_ID);
}

export function resetWorkoutHistorySyncToastState(): void {
    dismissed = false;
    wasTrackingSync = false;
    hadError = false;
    dismissWorkoutHistorySyncToast();
}

type TToastContext = {
    isPolling: boolean;
    retry: () => void;
};

/**
 * Toast action handler: ignore clicks while a sync request is already in flight.
 *
 * @param context - Poller retry callback and in-flight flag
 * @param event - Optional click event; preventDefault keeps the toast open
 */
export function clickWorkoutHistorySyncToastRetry(
    context: TToastContext,
    event?: { preventDefault: () => void },
): void {
    event?.preventDefault();
    if (context.isPolling) {
        return;
    }
    context.retry();
}

/**
 * Updates the persistent sync toast from latest progress (same id → in-place update).
 */
export function syncWorkoutHistorySyncToast(
    progress: TWorkoutSyncProgress | null,
    context: TToastContext,
): void {
    if (!progress) {
        return;
    }

    const { backedUpCount, hevyCount, syncError } = progress;
    const hasError = Boolean(syncError);
    const inProgress = isWorkoutHistorySyncInProgress(progress);
    const shouldShow = shouldShowWorkoutHistorySyncBanner(progress);
    const onDismiss = () => {
        dismissed = true;
    };

    if (hasError && !hadError) {
        dismissed = false;
    }
    hadError = hasError;

    if (inProgress) {
        wasTrackingSync = true;
    }

    if (!shouldShow || progress.paused) {
        if (wasTrackingSync && !hasError && !progress.paused) {
            dismissWorkoutHistorySyncToast();
            toast.success("Workout history synced");
        }
        wasTrackingSync = false;
        dismissed = false;
        if (progress.paused) {
            dismissWorkoutHistorySyncToast();
        }
        return;
    }

    if (dismissed) {
        return;
    }

    if (hasError) {
        toast.error("Workout history sync failed", {
            id: WORKOUT_HISTORY_SYNC_TOAST_ID,
            description: formatSyncError(syncError!),
            duration: Infinity,
            dismissible: true,
            closeButton: true,
            action: {
                label: context.isPolling ? "Retrying…" : "Retry sync",
                onClick: (event) => {
                    clickWorkoutHistorySyncToastRetry(context, event);
                },
                actionButtonStyle: context.isPolling
                    ? { opacity: 0.55, pointerEvents: "none" }
                    : undefined,
            },
            onDismiss,
        });
        return;
    }

    const percent =
        hevyCount > 0 ? Math.min(100, Math.round((backedUpCount / hevyCount) * 100)) : 0;

    toast(`Syncing workout history… ${backedUpCount} / ${hevyCount}`, {
        id: WORKOUT_HISTORY_SYNC_TOAST_ID,
        duration: Infinity,
        dismissible: true,
        closeButton: true,
        icon: createElement(Loader2, {
            className: "size-4 animate-spin text-lightSecondary",
            "aria-hidden": true,
        }),
        description: createElement(Progress, {
            value: percent,
            className: "mt-2 h-1.5",
            "aria-label": "Workout backup progress",
        }),
        onDismiss,
    });
}
